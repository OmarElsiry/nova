import AIAssistant from "@/components/ai/AIAssistant";

const AIAssistantPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Wallet Assistant
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your personal AI assistant for secure wallet operations. 
            All interactions are scoped to your account only.
          </p>
        </div>
        
        <AIAssistant />
      </div>
    </div>
  );
};

export default AIAssistantPage;
