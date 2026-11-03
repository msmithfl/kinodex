// Centered in the screen below the phone header and sub-navigation (9rem); from tablet up there are
// neither, so it fills the height
function LoadingSpinner() {
  return (
    <div className="flex h-[calc(100dvh-9rem-var(--bottom-nav-height,0px))] md:h-dvh items-center justify-center">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative w-32 h-32">
          <img
            src="/spinner-back.png"
            alt=""
            className="absolute inset-0 w-full h-full"
          />
          <img
            src="/spinner-front.png"
            alt=""
            className="absolute inset-0 w-full h-full animate-spin"
          />
        </div>
      </div>
    </div>
  );
}

export default LoadingSpinner;
