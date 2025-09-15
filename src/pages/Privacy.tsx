import React from 'react';

const Privacy = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose prose-lg dark:prose-invert">
        <p className="mb-4">
          This privacy policy explains how Channels Marketplace collects and uses your information.
        </p>
        <h2 className="text-2xl font-semibold mt-6 mb-4">Information We Collect</h2>
        <p className="mb-4">
          We collect information necessary to provide our marketplace services, including wallet addresses and transaction data.
        </p>
        <h2 className="text-2xl font-semibold mt-6 mb-4">How We Use Information</h2>
        <p className="mb-4">
          Your information is used to facilitate transactions and improve our platform services.
        </p>
        <h2 className="text-2xl font-semibold mt-6 mb-4">Data Security</h2>
        <p className="mb-4">
          We implement security measures to protect your personal information and transaction data.
        </p>
        <h2 className="text-2xl font-semibold mt-6 mb-4">Contact</h2>
        <p className="mb-4">
          For privacy-related questions, please contact our support team.
        </p>
      </div>
    </div>
  );
};

export default Privacy;