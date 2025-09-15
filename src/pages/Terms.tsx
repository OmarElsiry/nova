import React from 'react';

const Terms = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="prose prose-lg dark:prose-invert">
        <p className="mb-4">
          Welcome to Channels Marketplace. By using our platform, you agree to these terms.
        </p>
        <h2 className="text-2xl font-semibold mt-6 mb-4">Platform Usage</h2>
        <p className="mb-4">
          Our platform facilitates the trading of Telegram channels and digital assets using TON blockchain technology.
        </p>
        <h2 className="text-2xl font-semibold mt-6 mb-4">User Responsibilities</h2>
        <p className="mb-4">
          Users are responsible for maintaining the security of their wallets and accounts.
        </p>
        <h2 className="text-2xl font-semibold mt-6 mb-4">Contact</h2>
        <p className="mb-4">
          For questions about these terms, please contact our support team.
        </p>
      </div>
    </div>
  );
};

export default Terms;