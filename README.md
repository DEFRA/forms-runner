# forms-runner

test

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

If there is a .env file present, these will be loaded in first.

To symlink an external .env file, for example inside a [Keybase](https://keybase.io) folder:

`npm run symlink-env /location/of/.env`.

`symlink-config` accepts two variables, ENV_LOC and LINK_TO. If the file location is not passed in, you will be prompted for a location.
LINK_TO is optional, it defaults to `./${PROJECT_DIR}`.

### ⚠️ See [config](./config/default.js) for default values for each environment

Please use a config file instead. This will give you more control over each environment.
The defaults can be found in [config](./config/default.js). Place your config files in `runner/config`
See [https://github.com/node-config/node-config#readme](https://github.com/node-config/node-config#readme) for more info.

| name                    | description                           |        required         | default      |            valid            |                                                                   notes                                                                   |
| ----------------------- | ------------------------------------- | :---------------------: | ------------ | :-------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------: |
| NODE_ENV                | Node environment                      |           no            |              | development,test,production |                                                                                                                                           |
| PORT                    | Port number                           |           no            | 3009         |                             |                                                                                                                                           |
| OS_KEY                  | Ordnance Survey                       |           no            |              |                             |                                                      For address lookup by postcode                                                       |
| PAY_API_KEY             | Pay api key                           |           yes           |              |                             |                                                                                                                                           |
| PAY_RETURN_URL          | Pay return url                        |           yes           |              |                             |                                              For GOV.UK Pay to redirect back to our service                                               |
| PAY_API_URL             | Pay api url                           |           yes           |              |                             |                                                                                                                                           |
| NOTIFY_TEMPLATE_ID      | Notify api key                        |           yes           |              |                             |          Template ID required to send form payloads via [GOV.UK Notify](https://www.notifications.service.gov.uk) email service.          |
| NOTIFY_API_KEY          | Notify api key                        |           yes           |              |                             |            API KEY required to send form payloads via [GOV.UK Notify](https://www.notifications.service.gov.uk) email service.            |
| GTM_ID_1                | Google Tag Manager ID 1               |           no            |              |                             |                                                                                                                                           |
| GTM_ID_2                | Google Tag Manager ID 2               |           no            |              |                             |                                                                                                                                           |
| MATOMO_URL              | URL of Matomo                         |           no            |              |                             |                                                                                                                                           |
| MATOMO_ID               | ID of Matomo site                     |           no            |              |                             |                                                                                                                                           |
| SSL_KEY                 | SSL Key                               |           no            |              |                             |                                                                                                                                           |
| SSL_CERT                | SSL Certificate                       |           no            |              |                             |                                                                                                                                           |
| PREVIEW_MODE            | Preview mode                          |           no            | false        |                             | This should only be used in a dev or testing environment. Setting true will allow POST requests from the designer to add or mutate forms. |
| LOG_LEVEL               | Log level                             |           no            | debug        |   trace,debug,info,error    |                                                                                                                                           |
| PRIVACY_POLICY_URL      | The url used in footer's privacy link |           no            | help/privacy |                             |                                                                                                                                           |
| API_ENV                 | Switch for API keys                   |           no            |              |       test,production       |             If the JSON file supplies test and live API keys, this is used to switch between which key which needs to be used             |
| PHASE_TAG               | Tag to use for phase banner           |           no            | beta         |  alpha, beta, empty string  |                                                                                                                                           |
| AUTH_ENABLED            | Enable auth for all form pages        |           no            | false        |                             |                                                                                                                                           |
| AUTH_CLIENT_ID          | oAuth client ID                       | If AUTH_ENABLED is true |              |                             |                                                                                                                                           |
| AUTH_CLIENT_SECRET      | oAuth client secret                   | If AUTH_ENABLED is true |              |                             |                                                                                                                                           |
| AUTH_CLIENT_AUTH_URL    | oAuth client authorise endpoint       | If AUTH_ENABLED is true |              |                             |                                                                                                                                           |
| AUTH_CLIENT_TOKEN_URL   | oAuth client token endpoint           | If AUTH_ENABLED is true |              |                             |                                                                                                                                           |
| AUTH_CLIENT_PROFILE_URL | oAuth client user profile endpoint    | If AUTH_ENABLED is true |              |                             |                                                                                                                                           |

# Testing

Tests are found inside `test/cases`. For test scripts, name them `${NAME}.test.js`.

# Test coverage threshold

Unit test coverage threshold, code coverage below which build will fail is set by using lab's switch -t COVERAGE_LEVEL, currently threshold is configured to 83%, see unit-test-cov script in [package.json](package.json).

# Deployment

Currently CI is done with github actions. Pushes to main
will trigger a build phase which includes running tests and [lighthouse](https://developers.google.com/web/tools/lighthouse)
accessibility audits. Builds will fail if the accessibility score is less than 90%.

# Outputs

At the end of a form, there are multiple output types. The schemas for the right json format can be found in the engine repo.
Additional steps are required for the different output types.

- Notify
  - A GOV.UK [notify](https://www.notifications.service.gov.uk) is required
  - For each notification you wish to send, a template must be set up. If there are 'personalisations' they must match the configuration
- Sheets
  - This is currently a [Google Sheets](https://docs.google.com/spreadsheets) integration
  - For each sheet you wish to add data to, you must have have the spreadsheet id
  - You must have a Google Cloud Platform (GCP) account
  - create a project in GCP and note down the project id.
  - enable Google Sheets API for this project
  - Create a [service account](https://developers.google.com/identity/protocols/oauth2/service-account#creatinganaccount) in this project. (You only need to follow the 'Creating a service account' steps on this page)
    - Once it is created, download the credentials (this will include the private_key and client_email)
- Webhook
  - The webhook must accept a POST request
  - It should also return with a JSON with the key 'reference' in the body

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
