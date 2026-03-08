interface CounterProps {
  count: number;
  className?: string;
}

function Counter({ count, className = "" }: CounterProps) {
  return (
    <span
      className={`px-2 py-1 bg-gray-800 rounded-md font-medium ${className}`}
    >
      {count}
    </span>
  );
}

export default Counter;
