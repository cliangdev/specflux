function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SF</span>
          </div>
          <h1 className="text-xl font-semibold">SpecFlux</h1>
        </div>
      </header>
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-medium mb-2">Welcome to SpecFlux</h2>
            <p className="text-gray-400">
              AI-powered project orchestration for multi-repo development.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
