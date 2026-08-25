# Dona Chat

A RAG (Retrieval-Augmented Generation) chatbot built with Next.js and the AI SDK, able to answer questions based on a set of indexed documents.

This project is a customized fork of [emertechie/rag-ai-chatbot](https://github.com/emertechie/rag-ai-chatbot), itself based on Vercel's [Chat SDK](https://github.com/vercel/chatbot).

## About

The goal of this project is to build a chatbot that can:
- Answer general questions through an LLM
- Index one or more documents (Markdown for now, extensible to other formats)
- Answer precise questions based on the content of these documents (RAG)
- Display the sources used for each answer

## Tech stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **AI**: [AI SDK](https://sdk.vercel.ai/docs) (Vercel), OpenAI models (GPT-4o, GPT-3.5 Turbo, DALL·E 3, text-embedding-3-small)
- **Database**: PostgreSQL via [Neon](https://neon.tech) + [Drizzle ORM](https://orm.drizzle.team)
- **File storage**: [Vercel Blob](https://vercel.com/storage/blob)
- **Authentication**: [Auth.js](https://authjs.dev)
- **UI**: [shadcn/ui](https://ui.shadcn.com), [Tailwind CSS](https://tailwindcss.com), [Radix UI](https://radix-ui.com)
- **Package manager**: pnpm

## Local setup

### Prerequisites

- Node.js 18+
- pnpm (`npm i -g pnpm`)
- A [Vercel](https://vercel.com) account (free) to provision the Neon database and Blob storage
- An OpenAI-compatible API key (direct, or via the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway))

### Steps

1. **Clone the repo**
   ```bash
   git clone https://github.com/DonaFidele/dona-chat.git
   cd dona-chat
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Link the project to Vercel to automatically provision the database and storage:
   ```bash
   vercel link
   vercel env pull
   ```

   Then manually fill in `.env.local` (see `.env.example`):
   - `AUTH_SECRET`: generate with `openssl rand -base64 32`
   - `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY`: API key for the language model(s)

4. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

   The app is available at [http://localhost:3000](http://localhost:3000).

## Indexing documents

The chatbot prioritizes answers based on the documents indexed in its knowledge base.

**From a local folder** (`.md` / `.mdx` files):
```bash
npx tsx --env-file=.env.local indexer/index.ts --path ./my-documents
```

**From an `llms.txt` file**:
```bash
npx tsx --env-file=.env.local indexer/index.ts --url <link-to-llms.txt>
```

Available options:
- `--delay <ms>`: delay between requests (default: 250ms)
- `--max-files <n>`: maximum number of files to process

## Changes made compared to the original fork

This section lists the changes I've personally made to the project (to be updated as development progresses):

- [ ] Relaxed the system prompt to let the chatbot answer general questions in addition to document-based ones
- [ ] Added support for additional document formats in the indexer (PDF, DOCX)
- [ ] ...

## Deployment

The project is deployed on Vercel. Every push to the `main` branch triggers an automatic deployment.

## License

This project inherits the license from the original repo (`vercel/chatbot`), see [LICENSE](./LICENSE).