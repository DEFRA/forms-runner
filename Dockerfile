ARG PARENT_VERSION=2.2.0-node20.3.0
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

COPY --chown=node:node src config public install_model.sh ./
# TODO remove model installation from git

RUN npm install --global yarn

COPY --chown=node:node . ./

RUN bash install_model.sh
RUN yarn

CMD [ "yarn", "run", "dev" ]

FROM development as productionBuild

ENV NODE_ENV production

RUN yarn run build

FROM defradigital/node:${PARENT_VERSION} AS production

ENV TZ="Europe/London"

ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node:${PARENT_VERSION}

COPY --from=productionBuild /home/node/package*.json ./
COPY --from=productionBuild /home/node/node_modules ./node_modules
COPY --from=productionBuild /home/node/dist ./dist
COPY --from=productionBuild /home/node/bin ./bin
COPY --from=productionBuild /home/node/config ./config

ARG PORT
ENV PORT ${PORT}
EXPOSE ${PORT}

CMD [ "yarn", "start" ]
