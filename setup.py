import os

# Define the directory structure as a list of directories to create
directories = [
    "configs/linting",
    "configs/build",
    "configs/typescript",
    "public/assets",
    "src/assets",
    "src/components",
    "src/pages",
    "src/services",
    "src/debug",
    ".vercel"
]

# Create all directories from the list
for directory in directories:
    os.makedirs(directory, exist_ok=True)

# Define files and their initial content as a dictionary.
# Keys are file paths (relative to the current folder), values are the file content.
files = {
    "configs/linting/eslint.config.js": """\
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    browser: true,
    node: true
  },
  rules: {
    // Customize your linting rules here
  }
};
""",
    "configs/build/vite.config.ts": """\
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
""",
    "configs/build/postcss.config.js": """\
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
""",
    "configs/build/tailwind.config.js": """\
module.exports = {
  content: [
    "./public/**/*.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
""",
    "configs/typescript/tsconfig.json": """\
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
""",
    "public/index.html": """\
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/assets/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WorldFund</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
""",
    "public/assets/vite.svg": "",  # You can place your SVG content here if desired
    "src/App.tsx": """\
import React from 'react';
import './index.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <h1>Welcome to WorldFund</h1>
    </div>
  );
};

export default App;
""",
    "src/main.tsx": """\
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import MiniKitProvider from './MiniKitProvider';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <MiniKitProvider>
      <App />
    </MiniKitProvider>
  </React.StrictMode>
);
""",
    "src/index.css": """\
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom global styles */
body {
  font-family: sans-serif;
}
""",
    "src/MiniKitProvider.tsx": """\
import React, { ReactNode } from 'react';

interface MiniKitProviderProps {
  children: ReactNode;
}

// Stub for MiniKit integration
const MiniKitProvider: React.FC<MiniKitProviderProps> = ({ children }) => {
  // Initialization code for MiniKit can be added here
  return <>{children}</>;
};

export default MiniKitProvider;
""",
    "src/assets/react.svg": "",  # You can place your React logo SVG content here
    "src/components/AdminPanel.tsx": """\
import React from 'react';

const AdminPanel: React.FC = () => {
  return (
    <div>
      <h2>Admin Panel</h2>
      {/* Add admin functionalities here */}
    </div>
  );
};

export default AdminPanel;
""",
    "src/components/WorldIDAuth.tsx": """\
import React from 'react';

const WorldIDAuth: React.FC = () => {
  return (
    <div>
      <h2>WorldID Authentication</h2>
      {/* Add WorldID authentication logic here */}
    </div>
  );
};

export default WorldIDAuth;
""",
    "src/pages/LandingPage.tsx": """\
import React from 'react';

const LandingPage: React.FC = () => {
  return (
    <div>
      <h1>Landing Page</h1>
      <p>This is the main landing page for WorldFund.</p>
    </div>
  );
};

export default LandingPage;
""",
    "src/services/AuthService.ts": """\
class AuthService {
  login(username: string, password: string): Promise<boolean> {
    // Implement your login logic here
    return Promise.resolve(true);
  }
}

export default new AuthService();
""",
    "src/services/UserStore.ts": """\
type User = {
  id: string;
  name: string;
};

class UserStore {
  private user: User | null = null;

  setUser(user: User) {
    this.user = user;
  }

  getUser(): User | null {
    return this.user;
  }
}

export default new UserStore();
""",
    "src/debug/ErudaProvider.tsx": """\
import React, { useEffect } from 'react';

const ErudaProvider: React.FC = ({ children }) => {
  useEffect(() => {
    import('eruda').then(eruda => {
      eruda.init();
    });
  }, []);

  return <>{children}</>;
};

export default ErudaProvider;
""",
    ".vercel/project.json": """\
{
  "projectId": "your-vercel-project-id",
  "orgId": "your-vercel-org-id",
  "settings": {}
}
""",
    "package.json": """\
{
  "name": "worldfund",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^4.0.0",
    "typescript": "^4.9.0",
    "eslint": "^8.36.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.3.0"
  }
}
""",
    "README.md": """\
# WorldFund

This is a simplified React project built with Vite, TypeScript, Tailwind CSS, and ESLint. Configuration files are organized under `configs/` to keep the root clean.

## Available Scripts

- `npm run dev` – Start the development server.
- `npm run build` – Build the production bundle.
- `npm run preview` – Preview the production build.

## Project Structure

- **configs/** – Contains all configuration files.
- **public/** – Static assets and the HTML entry point.
- **src/** – Main application code, including components, pages, services, etc.
- **.vercel/** – Deployment configuration for Vercel.
"""
}

# Iterate over the files dictionary to create files with the given content.
for file_path, content in files.items():
    # Get the directory portion of the file path
    dir_name = os.path.dirname(file_path)
    # Only try to create directory if it is not empty
    if dir_name and not os.path.exists(dir_name):
        os.makedirs(dir_name, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Project structure created successfully.")
