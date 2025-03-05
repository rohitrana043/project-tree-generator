import React, { useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import SEO from '../components/common/SEO';
import TreePreview from '../components/common/TreePreview';
import FileUploader from '../components/generator/FileUploader';
import GithubForm from '../components/generator/GithubForm';
import { githubApi, uploadApi } from '../utils/api';
import './GenerateTreePage.css';

const GenerateTreePage = () => {
  const [treeText, setTreeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGithubSubmit = async (githubData) => {
    setLoading(true);
    setError(null);

    try {
      const data = await githubApi.generateTree(
        githubData.url,
        githubData.branch,
        githubData.path
      );
      setTreeText(data.treeText);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    setLoading(true);
    setError(null);

    try {
      const data = await uploadApi.uploadFile(file);
      setTreeText(data.treeText);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="generate-tree-container">
      <SEO
        title="Generate Project Tree Structures"
        description="Create a visual tree structure of your GitHub repository or uploaded folder. Quickly visualize your project's file and folder organization."
        keywords="project tree, directory visualization, github project structure, folder visualization, code tree, directory tree"
        canonical="/generate-tree"
      />

      <h1>Generate Project Tree Structure</h1>

      <Tabs>
        <TabList>
          <Tab>From GitHub</Tab>
          <Tab>From File Upload</Tab>
        </TabList>

        <TabPanel>
          <GithubForm onSubmit={handleGithubSubmit} />
        </TabPanel>

        <TabPanel>
          <FileUploader onUpload={handleFileUpload} />
        </TabPanel>
      </Tabs>

      {loading && (
        <div className="loading-spinner" aria-live="polite">
          Generating tree structure...
        </div>
      )}

      {error && (
        <div className="error-message" aria-live="assertive">
          {error}
        </div>
      )}

      {treeText && (
        <div className="result-section">
          <h2>Generated Tree Structure</h2>
          <TreePreview treeText={treeText} />
        </div>
      )}

      {/* FAQ section for SEO */}
      <div className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-item">
          <h3>How do I generate a tree structure from my GitHub repository?</h3>
          <p>
            Simply enter your GitHub repository URL, select the branch, and
            optionally specify a subfolder path. Click "Generate Tree" and the
            tool will create a visual representation of your project structure.
          </p>
        </div>
        <div className="faq-item">
          <h3>What file types can I upload to generate a tree structure?</h3>
          <p>
            Currently, the tool supports ZIP files containing your project
            files. The maximum file size is 10MB.
          </p>
        </div>
        <div className="faq-item">
          <h3>Can I save the generated tree structure?</h3>
          <p>
            Yes, you can copy the tree structure to your clipboard or download
            it as a text file.
          </p>
        </div>
      </div>

      {/* Schema.org structured data */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Project Tree Generator',
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          description:
            'Generate project tree structures from GitHub repositories or folder uploads',
        })}
      </script>
    </div>
  );
};

export default GenerateTreePage;
