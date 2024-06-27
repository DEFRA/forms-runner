# forms-runner

Citizen-facing forms using a config driven Node application.

This repository is forked from [the old Defra digital form builder](https://github.com/DEFRA/digital-form-builder).
These projects has been adapted to run several configurations on a single instance.

> DEFRA's digital form builder is a metadata-driven framework that builds on our robust,
> enterprise backend tech stack and the new gov.uk frontend Design System and allows form based gov.uk sites to be easily
> built using a graphical design tool.

The designer is no longer a plugin and is responsible for running itself on default port 3000.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Local JSON API](#local-json-api)
  - [Production](#production)
  - [npm scripts](#npm-scripts)
- [Docker](#docker)
  - [Development Image](#development-image)
  - [Production Image](#production-image)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v20`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
$ cd forms-runner
$ nvm use
```

## Local development

for local developers

### Setup

Install application dependencies:

```bash
$ npm ci
```

### Development

To run the application in `development` mode run:

```bash
$ npm run dev
```

### Production

To mimic the application running in `production` mode locally run:

```bash
$ npm run start
```

### npm scripts

All available npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
$ npm run
```

## Docker

### Development image

Build:

```bash
$ docker build --target development --no-cache --tag forms-runner:development .
```

Run:

```bash
$ docker run -p 3000:3000 forms-runner:development
```

### Production image

Build:

```bash
docker build --no-cache --tag forms-runner .
```

Run:

```bash
$ docker run -p 3000:3000 forms-runner
```

# Environment variables

If there is a .env file present, these will be loaded in.

### ⚠️ See [config](./src/config/index.ts) for default values for each environment

Please use a config file instead. This will give you more control over each environment.
The defaults can be found in [config](./src/config/index.ts). Place your config files in `runner/config`
See [https://github.com/node-config/node-config#readme](https://github.com/node-config/node-config#readme) for more info.

| name               | description                                                               | required | default      |            valid            |                                                            notes                                                            |
| ------------------ | ------------------------------------------------------------------------- | :------: | ------------ | :-------------------------: | :-------------------------------------------------------------------------------------------------------------------------: |
| NODE_ENV           | Node environment                                                          |    no    |              | development,test,production |                                                                                                                             |
| PORT               | Port number                                                               |    no    | 3009         |                             |                                                                                                                             |
| NOTIFY_TEMPLATE_ID | Notify api key                                                            |   yes    |              |                             |   Template ID required to send form payloads via [GOV.UK Notify](https://www.notifications.service.gov.uk) email service.   |
| NOTIFY_API_KEY     | Notify api key                                                            |   yes    |              |                             |     API KEY required to send form payloads via [GOV.UK Notify](https://www.notifications.service.gov.uk) email service.     |
| LOG_LEVEL          | Log level                                                                 |    no    | debug        |   trace,debug,info,error    |                                                                                                                             |
| PRIVACY_POLICY_URL | The url used in footer's privacy link                                     |    no    | help/privacy |                             |                                                                                                                             |
| PHASE_TAG          | Tag to use for phase banner                                               |    no    | beta         |  alpha, beta, empty string  |                                                                                                                             |
| FEEDBACK_LINK      | Link to display in the phase banner when asking for feedback.             |    no    |              |                             | Used for an anchor tag's href. To display an email link, use a 'mailto:dest@domain.com' value. Else use a standard website. |
| HTTP_PROXY         | HTTP proxy to use, e.g. the one from CDP. Currently used for Hapi Wreck.  |    no    |              |                             |
| HTTPS_PROXY        | HTTPS proxy to use, e.g. the one from CDP. Currently used for Hapi Wreck. |    no    |              |                             |
| NO_PROXY           | HTTP proxy to use, e.g. the one from CDP. Currently used for Hapi Wreck.  |    no    |              |                             |

For proxy options, see https://www.npmjs.com/package/proxy-from-env which is used by https://github.com/TooTallNate/proxy-agents/tree/main/packages/proxy-agent.

# Testing

Tests are found inside `test/cases`. For test scripts, name them `${NAME}.test.js`.

# Outputs

At the end of a form, there are multiple output types. The schemas for the right json format can be found in the engine repo.
Additional steps are required for the different output types.

- Notify
  - A GOV.UK [notify](https://www.notifications.service.gov.uk) is required
  - For each notification you wish to send, a template must be set up. If there are 'personalisations' they must match the configuration

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
