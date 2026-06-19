FROM node:22-alpine

WORKDIR /app

RUN corepack enable                                                                                                  

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile  

COPY . .                                                                                                             

ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/build_db"
RUN pnpm build                                                                                                       

EXPOSE 3000  

CMD ["pnpm", "start"]    
