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

WORKDIR /home/node/app

COPY --chown=node:node packag*.json install_model.sh ./

RUN npm ci --ignore-scripts
RUN npm run postinstall

COPY --chown=node:node ./ ./

CMD [ "npm", "run", "dev" ]

FROM development as productionBuild

WORKDIR /home/node/app

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

WORKDIR /home/node/app

COPY --from=productionBuild /home/node/app/package*.json ./
COPY --from=productionBuild /home/node/app/node_modules ./node_modules
COPY --from=productionBuild /tmp/defra-forms-designer/node_modules ./node_modules
COPY --from=productionBuild /tmp/defra-forms-designer/model ./node_modules/@defra/forms-model
COPY --from=productionBuild /tmp/defra-forms-designer/queue-model ./node_modules/@defra/forms-queue-model
COPY --from=productionBuild /home/node/app/dist ./dist
COPY --from=productionBuild /home/node/app/bin ./bin
COPY --from=productionBuild /home/node/app/config ./config
COPY --from=productionBuild /home/node/app/public ./public

ARG PORT
ENV PORT ${PORT}
EXPOSE ${PORT}

CMD [ "npm", "run", "start" ]
