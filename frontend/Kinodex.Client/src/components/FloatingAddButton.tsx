export default function FloatingAddButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="fixed md:hidden bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />    </svg> 
    </button>
  );
}