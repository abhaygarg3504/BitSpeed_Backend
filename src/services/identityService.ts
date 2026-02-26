import prisma from "../prismaClient.js";
import type {ContactNode,ContactResponse,IdentifyRequest,} from "../types.js";

async function collectCluster(seedIds: number[]): Promise<ContactNode[]> {
  const visited = new Set<number>();
  const queue = [...seedIds];
  const cluster: ContactNode[] = [];

  while (queue.length > 0) {
    const batch = await prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [
          { id: { in: queue } },
          { linkedId: { in: queue } },
        ],
      },
    });

    queue.length = 0;

    for (const record of batch) {
      if (!visited.has(record.id)) {
        visited.add(record.id);
        cluster.push(record as ContactNode);

        if (record.linkedId && !visited.has(record.linkedId)) {
          queue.push(record.linkedId);
        }
      }
    }
  }

  return cluster;
}

function resolvePrimary(cluster: ContactNode[]): ContactNode {
  return cluster.reduce((oldest, current) =>
    current.createdAt < oldest.createdAt ? current : oldest
  );
}


function formatResponse(
  primary: ContactNode,
  cluster: ContactNode[]
): ContactResponse {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const secondaryIds: number[] = [];

  for (const contact of cluster) {
    if (contact.email) emails.add(contact.email);
    if (contact.phoneNumber) phones.add(contact.phoneNumber);

    if (contact.id !== primary.id) {
      secondaryIds.push(contact.id);
    }
  }

  return {
    contact: {
      primaryContatctId: primary.id,
      emails: Array.from(emails),
      phoneNumbers: Array.from(phones),
      secondaryContactIds: secondaryIds,
    },
  };
}

export async function identifyContact(
  input: IdentifyRequest
): Promise<ContactResponse> {
  const email = input.email ?? null;
  const phoneNumber = input.phoneNumber ?? null;

  if (!email && !phoneNumber) {
    throw new Error("At least one of email or phoneNumber is required.");
  }

  return prisma.$transaction(async (tx) => {
    const matches = await tx.contact.findMany({
      where: {
        deletedAt: null,
        OR: [
          ...(email ? [{ email }] : []),
          ...(phoneNumber ? [{ phoneNumber }] : []),
        ],
      },
    });
    if (matches.length === 0) {
      const created = await tx.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary",
        },
      });

      return {
        contact: {
          primaryContatctId: created.id,
          emails: created.email ? [created.email] : [],
          phoneNumbers: created.phoneNumber
            ? [created.phoneNumber]
            : [],
          secondaryContactIds: [],
        },
      };
    }

    const cluster = await collectCluster(matches.map((m) => m.id));

    const primary = resolvePrimary(cluster);

    for (const contact of cluster) {
      if (
        contact.id !== primary.id &&
        contact.linkPrecedence === "primary"
      ) {
        await tx.contact.update({
          where: { id: contact.id },
          data: {
            linkPrecedence: "secondary",
            linkedId: primary.id,
          },
        });
      }
    }

    const emailExists = cluster.some((c) => c.email === email);
    const phoneExists = cluster.some(
      (c) => c.phoneNumber === phoneNumber
    );

    if (!emailExists || !phoneExists) {
      const newSecondary = await tx.contact.create({
        data: {
          email,
          phoneNumber,
          linkedId: primary.id,
          linkPrecedence: "secondary",
        },
      });

      cluster.push(newSecondary as ContactNode);
    }

    return formatResponse(primary, cluster);
  });
}