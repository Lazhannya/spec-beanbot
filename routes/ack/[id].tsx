/**
 * Acknowledgement Page - Handles reminder acknowledgements via clickable links
 * No Discord webhooks or Gateway needed!
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { verifyAcknowledgementToken } from "../../discord-bot/lib/utils/ack-token.ts";
import { ReminderService } from "../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../discord-bot/lib/reminder/repository.ts";
import { DiscordDeliveryService } from "../../discord-bot/lib/discord/delivery.ts";
import { EscalationProcessor } from "../../discord-bot/lib/reminder/escalation.ts";
import { ReminderStatus } from "../../discord-bot/types/reminder.ts";

interface AckPageData {
  success: boolean;
  action?: "acknowledge" | "decline";
  reminderId?: string;
  error?: string;
  reminderContent?: string;
}

export const handler: Handlers<AckPageData> = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const reminderId = ctx.params.id;
    const action = url.searchParams.get("action") as "acknowledge" | "decline" | null;
    const token = url.searchParams.get("token");

    // Validate reminder ID
    if (!reminderId) {
      return ctx.render({
        success: false,
        error: "Missing reminder ID."
      });
    }

    // Validate parameters
    if (!action || (action !== "acknowledge" && action !== "decline")) {
      return ctx.render({
        success: false,
        error: "Invalid action. Must be 'acknowledge' or 'decline'."
      });
    }

    if (!token) {
      return ctx.render({
        success: false,
        error: "Missing security token."
      });
    }

    // Verify token
    const isValidToken = await verifyAcknowledgementToken(reminderId, action, token);
    if (!isValidToken) {
      return ctx.render({
        success: false,
        error: "Invalid or expired security token."
      });
    }

    try {
      // Get reminder from database
      const kv = await Deno.openKv();
      const repository = new ReminderRepository(kv);
      const service = new ReminderService(repository);

      const reminder = await repository.getById(reminderId);
      if (!reminder) {
        return ctx.render({
          success: false,
          error: "Reminder not found."
        });
      }

      // Process acknowledgement or decline
      if (action === "acknowledge") {
        const result = await service.acknowledgeReminder(reminderId, reminder.targetUserId);
        if (!result.success) {
          return ctx.render({
            success: false,
            error: result.error.message
          });
        }

        return ctx.render({
          success: true,
          action: "acknowledge",
          reminderId,
          reminderContent: reminder.content
        });
      } else {
        // Process decline
        const result = await service.declineReminder(reminderId, reminder.targetUserId);
        if (!result.success) {
          return ctx.render({
            success: false,
            error: result.error.message
          });
        }

        // Check if escalation was triggered - if so, send escalation message
        const updatedReminder = await repository.getById(reminderId);
        if (updatedReminder && updatedReminder.status === ReminderStatus.ESCALATED && updatedReminder.escalation) {
          console.log(`Escalation triggered for reminder ${reminderId}, sending escalation message`);
          
          // Get bot token and initialize escalation processor
          const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
          if (botToken) {
            const deliveryService = new DiscordDeliveryService(botToken);
            const escalationProcessor = new EscalationProcessor(deliveryService);
            
            // Send escalation message
            const escalationResult = await escalationProcessor.processEscalation(updatedReminder, "decline");
            
            if (!escalationResult.success) {
              console.error(`Failed to send escalation: ${escalationResult.error}`);
            } else {
              console.log(`Successfully sent escalation message for reminder ${reminderId}`);
            }
          } else {
            console.error("DISCORD_BOT_TOKEN not configured, cannot send escalation");
          }
        }

        return ctx.render({
          success: true,
          action: "decline",
          reminderId,
          reminderContent: reminder.content
        });
      }
    } catch (error) {
      console.error("Error processing acknowledgement:", error);
      return ctx.render({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  }
};

export default function AckPage({ data }: PageProps<AckPageData>) {
  if (!data.success) {
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div class="text-center">
            <div class="text-6xl mb-4">❌</div>
            <h1 class="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p class="text-gray-600 mb-6">{data.error}</p>
            <a
              href="/"
              class="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isAcknowledge = data.action === "acknowledge";

  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div class="text-center">
          <div class="text-6xl mb-4">
            {isAcknowledge ? "✅" : "❌"}
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-4">
            Reminder {isAcknowledge ? "Acknowledged" : "Declined"}
          </h1>
          
          {data.reminderContent && (
            <div class="bg-gray-100 rounded-lg p-4 mb-6">
              <p class="text-sm text-gray-500 mb-2">Reminder:</p>
              <p class="text-gray-800">{data.reminderContent}</p>
            </div>
          )}

          <p class="text-gray-600 mb-6">
            {isAcknowledge 
              ? "Thank you! Your acknowledgement has been recorded."
              : "Your decline has been recorded. The reminder may be escalated as configured."}
          </p>

          <div class="space-y-3">
            <p class="text-sm text-gray-500">
              You can now close this window.
            </p>
            <a
              href="/"
              class="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
