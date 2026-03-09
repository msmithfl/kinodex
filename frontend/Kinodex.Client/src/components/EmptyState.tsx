interface EmptyStateProps {
  message: string;
  showAddButton?: boolean;
  buttonText?: string;
}

function EmptyState({
  message,
}: EmptyStateProps) {
  return (
    <div className="text-center py-10">
      <p className="text-gray-400 text-lg mb-6">{message}</p>
    </div>
  );
}

export default EmptyState;
