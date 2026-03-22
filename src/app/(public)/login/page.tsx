import { LoginForm } from "@/components/auth/login-form";
import { Alert, PageHeader } from "@/components/ui";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_link: "The login link has expired or is invalid. Request a new link below.",
  session_expired: "Your session has expired. Please sign in again.",
  missing_code: "The login link is incomplete. Request a new link below.",
  auth_unavailable: "Sign-in is temporarily unavailable. Please try again later."
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="ui-auth-main">
      <PageHeader
        title="Sign in"
        description="Use your email to receive a secure one-time login link."
      />
      {params.error && ERROR_MESSAGES[params.error] ? (
        <Alert variant="danger">{ERROR_MESSAGES[params.error]}</Alert>
      ) : null}
      {params.next ? (
        <p className="ui-text-muted ui-text-break" style={{ margin: 0 }}>
          After sign-in you will continue to: {params.next}
        </p>
      ) : null}
      <LoginForm next={params.next} />
    </main>
  );
}
