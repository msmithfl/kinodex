import { SignIn } from "@clerk/clerk-react";

const SignInPage = () => {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 text-foreground">
      {/* Clerk Sign In Component; its colours come from clerkAppearance, set on ClerkProvider */}
      <div className="w-full max-w-md">
        <SignIn
          routing="virtual"
          signUpUrl="/sign-up"
          forceRedirectUrl="/"
          appearance={{ elements: { rootBox: "mx-auto" } }}
        />
      </div>
    </div>
  );
};

export default SignInPage;
