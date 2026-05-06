const dotenv = require("dotenv");
dotenv.config();

async function main() {
  const { Client } = await import("@notionhq/client");
  const { NotionToMarkdown } = await import("notion-to-md");
  const fs = require("fs");
  const path = require("path");

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const n2m = new NotionToMarkdown({ notionClient: notion });

  console.log("Notion에서 글을 가져오는 중...");

  const response = await notion.databases.query({
    database_id: process.env.NOTION_DB_ID,
    filter: {
      property: "Status",
      select: { equals: "Published" },
    },
    sorts: [{ property: "Date", direction: "descending" }],
  });

  console.log(`${response.results.length}개 글 발견`);

  if (!fs.existsSync("_posts")) fs.mkdirSync("_posts");

  for (const page of response.results) {
    const props = page.properties;

    const title = props.Name.title[0]?.plain_text || "Untitled";
    const date = props.Date.date?.start ||
      new Date().toISOString().split("T")[0];
    const slug = props.Slug.rich_text[0]?.plain_text ||
      title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    const description = props.Description.rich_text[0]?.plain_text || "";
    const cover = props.Cover.rich_text[0]?.plain_text || "";

    const mdBlocks = await n2m.pageToMarkdown(page.id);
    const body = n2m.toMarkdownString(mdBlocks).parent;

    const content = `---
layout: post
title: "${title}"
date: ${date}
description: "${description}"
image: ${cover}
---

${body}`;

    const filename = `${date}-${slug}.md`;
    const filepath = path.join("_posts", filename);
    fs.writeFileSync(filepath, content, "utf8");
    console.log(`✓ ${filename} 생성`);
  }

  console.log("완료!");
}

main().catch(console.error);