import React, { useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
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
        <div className="loading-spinner">Generating tree structure...</div>
      )}

      {error && <div className="error-message">{error}</div>}

      {treeText && (
        <div className="result-section">
          <h2>Generated Tree Structure</h2>
          <TreePreview treeText={treeText} />
        </div>
      )}
    </div>
  );
};

export default GenerateTreePage;
