> [!WARNING]
> This is proof of concept code for a project in Alpha. It may not be functional, use with caution.

# forms-runner

Core delivery platform Node.js Frontend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Local JSON API](#local-json-api)
  - [Production](#production)
  - [Yarn scripts](#yarn-scripts)
- [Docker](#docker)
  - [Development Image](#development-image)
  - [Production Image](#production-image)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v18` and [yarn](https://classic.yarnpkg.com/) `= v1`. You will find it
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
$ yarn
```

### Development

To run the application in `development` mode run:

```bash
$ yarn run dev
```

### Production

To mimic the application running in `production` mode locally run:

```bash
$ yarn run start
```

### Yarn scripts

All available Yarn scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
$ yarn run
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
