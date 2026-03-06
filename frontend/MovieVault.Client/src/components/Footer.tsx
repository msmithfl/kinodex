function Footer() {
  return (
    <footer className="bg-gray-800 border-t border-gray-700 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-2">
        <p className="text-center text-gray-400 text-sm">
          © {new Date().getFullYear()} MovieVault - Your Physical Media
          Collection Manager
        </p>
      </div>
    </footer>
  );
}

export default Footer;
