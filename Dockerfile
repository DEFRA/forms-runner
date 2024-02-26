ARG PARENT_VERSION=2.2.1-node20.9.0
ARG PORT=3000
ARG PORT_DEBUG=9229

FROM defradigital/node-development:${PARENT_VERSION} AS development

ENV TZ="Europe/London"

ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node-development:${PARENT_VERSION}

ARG PORT
ARG PORT_DEBUG
ENV PORT ${PORT}
EXPOSE ${PORT} ${PORT_DEBUG}

COPY --chown=node:node package.json install_model.sh ./
RUN bash install_model.sh
RUN npm ci

COPY --chown=node:node . ./
RUN npm ci

CMD [ "npm", "run", "dev" ]

FROM development as productionBuild

ENV NODE_ENV production

RUN npm run build

FROM defradigital/node:${PARENT_VERSION} AS production

ENV TZ="Europe/London"

# Add curl to template.
# CDP PLATFORM HEALTHCHECK REQUIREMENT
USER root
RUN apk update && \
    apk add curl
USER node

ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node:${PARENT_VERSION}

COPY --from=productionBuild /home/node/package*.json ./
COPY --from=productionBuild /home/node/node_modules ./node_modules
COPY --from=productionBuild /home/node/dist ./dist
COPY --from=productionBuild /home/node/bin ./bin
COPY --from=productionBuild /home/node/config ./config
COPY --from=productionBuild /home/node/public ./public

ARG PORT
ENV PORT ${PORT}
EXPOSE ${PORT}

CMD [ "npm", "run", "start" ]
