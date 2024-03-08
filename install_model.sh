#!/bin/sh

RUNNER_DIR=$(pwd)
DESIGNER_DIR=/tmp/defra-forms-designer

git -C "$DESIGNER_DIR" pull origin main --ff-only || git clone https://github.com/defra/forms-designer.git "$DESIGNER_DIR"

cd "$DESIGNER_DIR"
npm install
npm run build

cd "$DESIGNER_DIR/model"
npm link

cd "$DESIGNER_DIR/queue-model"
npm link

cd "$RUNNER_DIR"
npm link @defra/forms-model @defra/forms-queue-model
