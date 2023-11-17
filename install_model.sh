#¬/bin/sh

test -d /tmp/xgov-model || git clone https://github.com/XGovFormBuilder/digital-form-builder.git /tmp/xgov-model && cd /tmp/xgov-model/model && yarn && yarn build && cd -
yarn add /tmp/xgov-model/model/
