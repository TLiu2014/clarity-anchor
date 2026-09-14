# ClarityAnchor web app — runtime-only image.
# The Next.js standalone output is built on the HOST (`pnpm build`) and this image
# only packages it (no `pnpm install`/build runs in the container).
#
# Rebuild the standalone before building this image:
#   pnpm build
#   docker build -t clarityanchor-web .    (or use deploy/build-and-push.sh)
# Match --platform to your instance (linux/amd64 for t3/t2; linux/arm64 for t4g).

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Prebuilt standalone server + assets it doesn't inline.
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public
EXPOSE 3000
CMD ["node", "server.js"]
