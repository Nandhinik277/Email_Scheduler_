import axios from "axios";

const webhookUrl = process.env.SLACK_WEBHOOK_URL;

export async function sendSlackNotification(message: string) {
  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL is not configured");
    return;
  }

  try {
    await axios.post(webhookUrl, {
      text: message,
    });

    console.log("Slack notification sent");
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
  }
}