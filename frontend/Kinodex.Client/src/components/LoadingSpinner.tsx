function LoadingSpinner() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
