import { SignUp } from "@clerk/clerk-react";

const SignUpPage = () => {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 text-foreground">
      {/* Clerk Sign Up Component; its colours come from clerkAppearance, set on ClerkProvider */}
      <div className="w-full max-w-md">
        <SignUp
          routing="virtual"
          signInUrl="/sign-in"
          forceRedirectUrl="/"
          appearance={{ elements: { rootBox: "mx-auto" } }}
        />
      </div>
    </div>
  );
};

export default SignUpPage;
