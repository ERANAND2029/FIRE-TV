// Family Watch Referee - Example Configuration
// Copy this file to config.js or assets/www/config.js to enable optional AWS Bedrock integration.
// Never commit your real AWS credentials to version control.

window.APP_CONFIG = {
  // Set to true to attempt native Amazon Bedrock calls via MainActivity JavascriptInterface
  useBedrock: false,

  // AWS Bedrock Credentials (Optional - app seamlessly falls back to local intelligent Hinglish engine if empty or offline)
  awsRegion: "us-east-1",
  bedrockModelId: "anthropic.claude-3-haiku-20240307-v1:0",
  awsAccessKeyId: "YOUR_AWS_ACCESS_KEY_ID",
  awsSecretAccessKey: "YOUR_AWS_SECRET_ACCESS_KEY",
  awsSessionToken: "" // Optional if using temporary credentials
};
