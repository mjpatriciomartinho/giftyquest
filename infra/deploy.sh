#!/usr/bin/env bash
# Deploys GiftyQuest code to AWS without IAM permissions (the core stack must exist already):
#   1. bundles the server and updates the giftyquest-api Lambda,
#   2. builds the web app and publishes it on Amplify Hosting, which proxies /api and /mcp
#      to the Lambda URL so the browser only ever talks to one origin.
# Usage: AWS_PROFILE=sso-poweruser infra/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
REGION="${AWS_REGION:-eu-west-1}"
FN=giftyquest-api
APP_NAME=giftyquest
BRANCH=main
BUILD=infra/.build
rm -rf "$BUILD" && mkdir -p "$BUILD"

echo "1/4 Bundling the server for Lambda"
npx esbuild server/src/lambda.ts --bundle --platform=node --target=node22 --format=cjs \
  --outfile="$BUILD/lambda/index.js" --log-level=warning
(cd "$BUILD/lambda" && zip -qr ../lambda.zip .)

echo "2/4 Updating the Lambda code"
aws lambda update-function-code --region "$REGION" --function-name "$FN" \
  --zip-file "fileb://$BUILD/lambda.zip" --query 'LastUpdateStatus' --output text
aws lambda wait function-updated-v2 --region "$REGION" --function-name "$FN"
API_URL=$(aws lambda get-function-url-config --region "$REGION" --function-name "$FN" --query FunctionUrl --output text)
API_URL="${API_URL%/}"
echo "   API: $API_URL"

echo "3/4 Building the web app"
npm run build -w web >/dev/null
(cd web/dist && zip -qr "../../$BUILD/web.zip" .)

echo "4/4 Publishing on Amplify Hosting"
RULES=$(cat <<JSON
[
  {"source": "/api/<*>", "target": "$API_URL/api/<*>", "status": "200"},
  {"source": "/mcp/<*>", "target": "$API_URL/mcp/<*>", "status": "200"},
  {"source": "</^[^.]+\$|\\\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|glb)\$)([^.]+\$)/>", "target": "/index.html", "status": "200"}
]
JSON
)
APP_ID=$(aws amplify list-apps --region "$REGION" --query "apps[?name=='$APP_NAME'].appId | [0]" --output text)
if [ "$APP_ID" = "None" ] || [ -z "$APP_ID" ]; then
  APP_ID=$(aws amplify create-app --region "$REGION" --name "$APP_NAME" --platform WEB \
    --custom-rules "$RULES" --query app.appId --output text)
  aws amplify create-branch --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" --stage PRODUCTION >/dev/null
else
  aws amplify update-app --region "$REGION" --app-id "$APP_ID" --custom-rules "$RULES" >/dev/null
fi
read -r JOB_ID UPLOAD_URL < <(aws amplify create-deployment --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" \
  --query '[jobId, zipUploadUrl]' --output text)
curl -fsS -X PUT -T "$BUILD/web.zip" "$UPLOAD_URL"
aws amplify start-deployment --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" >/dev/null
for _ in $(seq 1 60); do
  STATUS=$(aws amplify get-job --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" --query job.summary.status --output text)
  [ "$STATUS" = "SUCCEED" ] && break
  [ "$STATUS" = "FAILED" ] && { echo "Amplify deployment failed"; exit 1; }
  sleep 5
done
echo "Done: https://$BRANCH.$APP_ID.amplifyapp.com"
