import { Resend } from "resend";
import { config } from "../../config/config.js";

type SendParentInvitationEmailInput = {
  invitationId: string;
  inviteeEmail: string;
  inviterEmail: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  token: string;
  expiresAt: Date;
};

let resendClient: Resend | undefined;

function getResendClient(): Resend {
  if (!config.resend.apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!resendClient) {
    resendClient = new Resend(config.resend.apiKey);
  }
  return resendClient;
}

function buildInvitationUrl(organizationSlug: string, token: string): string {
  const normalizedPath = config.invitations.acceptPath.startsWith("/")
    ? config.invitations.acceptPath
    : `/${config.invitations.acceptPath}`;
  return `${config.app.publicProtocol}://${organizationSlug}.${config.app.baseDomain}${normalizedPath}/${token}`;
}

export const invitationsEmailService = {
  sendParentInvitationEmail: async (
    input: SendParentInvitationEmailInput,
  ): Promise<void> => {
    if (!config.resend.fromEmail) {
      throw new Error("RESEND_FROM_EMAIL is not configured");
    }

    const invitationUrl = buildInvitationUrl(input.organizationSlug, input.token);
    const client = getResendClient();

    const { error } = await client.emails.send(
      {
        from: config.resend.fromEmail,
        to: [input.inviteeEmail],
        subject: `You're invited to ${input.organizationName} on Studiqo`,
        html: `<p>${input.inviterEmail} invited you to join ${input.organizationName} as a parent on Studiqo.</p><p><a href="${invitationUrl}">Accept invitation</a></p><p>This invitation expires on ${input.expiresAt.toISOString()}.</p>`,
      },
      {
        idempotencyKey: `invite/${input.organizationId}/${input.invitationId}`,
      },
    );

    if (error) {
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }
  },
};
