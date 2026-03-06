import { Link } from "react-router-dom";

interface EmptyStateProps {
  message: string;
  showAddButton?: boolean;
  buttonText?: string;
}

function EmptyState({
  message,
  showAddButton = true,
  buttonText = "+ Add Movie",
}: EmptyStateProps) {
  return (
    <div className="text-center py-10">
      <p className="text-gray-400 text-lg mb-6">{message}</p>
      {showAddButton && (
        <Link
          to="/add"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
        >
          {buttonText}
        </Link>
      )}
    </div>
  );
}

export default EmptyState;
