import { Client } from "@elastic/elasticsearch";

export const elasticsearch = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

const INDEX = "emails";

export async function initializeEmailIndex() {
  const exists = await elasticsearch.indices.exists({
    index: INDEX,
  });

  if (!exists) {
    await elasticsearch.indices.create({
      index: INDEX,
      mappings: {
        properties: {
          id: { type: "integer" },
          recipient: { type: "text" },
          subject: { type: "text" },
          body: { type: "text" },
          scheduledAt: { type: "date" },
          status: { type: "keyword" },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
        },
      },
    });

    console.log("Elasticsearch email index created");
  }
}

export async function indexEmail(email: {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  await elasticsearch.index({
    index: INDEX,
    id: String(email.id),
    document: {
      id: email.id,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      scheduledAt: email.scheduledAt,
      status: email.status,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
    },
    refresh: "wait_for",
  });
}

export async function searchEmails(query: string) {
  const result = await elasticsearch.search({
    index: INDEX,
    query: {
      multi_match: {
        query,
        fields: ["recipient", "subject", "body"],
      },
    },
  });

  return result.hits.hits.map((hit) => hit._source);
}