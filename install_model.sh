#¬/bin/sh

test -d /tmp/defra-forms-designer && git -C /tmp/defra-forms-designer pull --ff-only || git clone https://github.com/defra/forms-designer.git /tmp/defra-forms-designer

cd /tmp/defra-forms-designer && npm ci --workspace model --workspace queue-model && npm run build --workspace model --workspace queue-model && cd -

cd /tmp/defra-forms-designer/model/ && npm link && cd -
cd /tmp/defra-forms-designer/queue-model/ && npm link && cd -

npm link @defra/forms-model @defra/forms-queue-model
