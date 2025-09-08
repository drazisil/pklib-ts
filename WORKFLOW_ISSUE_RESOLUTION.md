# Release Workflow Issue Resolution

## Problem
The package publishing workflows didn't run when release `v1.1.0-clean-api` was created on September 6, 2025.

## Root Cause
The GitHub Actions workflows (`npm-publish.yml` and `npm-publish-github-packages.yml`) were added to the repository on September 8, 2025 - **2 days after the release was created**. 

GitHub Actions only trigger if the workflow files exist in the target branch at the time the triggering event occurs. Since the workflows didn't exist when the release was created, they couldn't be triggered.

## Issues Fixed

### 1. Timing Issue
- **Issue**: Workflows added after release creation
- **Resolution**: For future releases, workflows are now in place

### 2. Duplicate Workflow Names
- **Issue**: Both publishing workflows had the same name "Node.js Package"
- **Resolution**: 
  - `npm-publish.yml` renamed to "Publish to NPM"
  - `npm-publish-github-packages.yml` renamed to "Publish to GitHub Packages"

### 3. Version Mismatch
- **Issue**: package.json version (1.0.0) didn't match release tag (v1.1.0-clean-api)
- **Resolution**: Updated package.json version to match the release

### 4. Secret Name Convention
- **Issue**: npm-publish.yml used `secrets.npm_token` (non-standard)
- **Resolution**: Changed to `secrets.NPM_TOKEN` (standard convention)

## How to Prevent This in Future

1. **Always add workflows before creating releases**
2. **Test workflows** on a test release or using workflow_dispatch triggers
3. **Ensure package.json version matches release tag** before creating the release
4. **Use standard secret naming conventions**

## Next Steps for Current Release

Since the workflows didn't run for `v1.1.0-clean-api`, you may want to:

1. **Option 1**: Manually publish the package to npm and GitHub Packages
2. **Option 2**: Create a new patch release (e.g., v1.1.1) to trigger the workflows
3. **Option 3**: Delete and recreate the current release (will trigger workflows since they now exist)

The workflows are now properly configured and will trigger for any future releases.