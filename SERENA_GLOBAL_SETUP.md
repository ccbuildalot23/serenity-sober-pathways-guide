# 🚀 Serena MCP Global Installation Guide

## ✅ Installation Complete!

Serena MCP has been successfully installed and configured for **global use across all projects**.

## 📍 Installation Summary

### 1. **UV Package Manager**
- **Location**: `C:\Users\cmcal\.local\bin\uv.exe`
- **Version**: 0.8.13
- **Purpose**: Modern Python package management

### 2. **Serena MCP Server**
- **Source Location**: `C:\Users\cmcal\OneDrive\Documents\serenity-sober-pathways-guide\serena`
- **Virtual Environment**: `.venv` in source directory
- **Python Version**: 3.11.13 (managed by UV)
- **Installation Type**: Editable install with UV sync

### 3. **Claude Desktop Integration**
- **Config File**: `C:\Users\cmcal\AppData\Roaming\Claude\claude_desktop_config.json`
- **Server Name**: "serena"
- **Status**: ✅ Configured and ready

### 4. **Global Launch Scripts**
- **Batch Script**: `C:\tools\start-serena.bat`
- **PowerShell Script**: `C:\tools\start-serena.ps1`

## 🎯 How to Use Serena MCP

### From Any Project Directory

#### Option 1: Command Line (Direct)
```bash
# From any directory
C:\Users\cmcal\.local\bin\uv.exe run --directory "C:\Users\cmcal\OneDrive\Documents\serenity-sober-pathways-guide\serena" serena-mcp-server
```

#### Option 2: Batch Script
```batch
# From any directory
C:\tools\start-serena.bat

# With specific project
C:\tools\start-serena.bat "C:\path\to\project"
```

#### Option 3: PowerShell Script
```powershell
# From any directory with defaults
C:\tools\start-serena.ps1

# With custom options
C:\tools\start-serena.ps1 -Project "C:\my\project" -LogLevel DEBUG
```

#### Option 4: NPM Scripts (in projects)
Add to any project's `package.json`:
```json
"scripts": {
  "serena": "C:\\Users\\cmcal\\.local\\bin\\uv.exe run --directory \"C:\\Users\\cmcal\\OneDrive\\Documents\\serenity-sober-pathways-guide\\serena\" serena-mcp-server"
}
```

## 🔧 Configuration Options

### Serena MCP Server Options
- `--project [PATH]`: Project directory to analyze
- `--context [NAME]`: Context mode (default: desktop-app)
- `--mode [MODES]`: Operation modes (default: interactive,editing)
- `--log-level [LEVEL]`: Logging level (DEBUG|INFO|WARNING|ERROR)
- `--enable-web-dashboard`: Enable web dashboard
- `--port [NUMBER]`: Server port (default: 8000)

### Available Contexts
- `desktop-app`: Desktop application development
- `agent`: AI agent development
- `chatgpt`: ChatGPT-style interactions
- `codex`: Code generation focus
- `ide-assistant`: IDE integration mode

### Available Modes
- `interactive`: Interactive development
- `editing`: Code editing focus
- `planning`: Project planning
- `onboarding`: New user onboarding
- `one-shot`: Single command execution

## 🔍 Verification

### Test Installation
```bash
# Test from any directory
cd C:\
C:\Users\cmcal\.local\bin\uv.exe run --directory "C:\Users\cmcal\OneDrive\Documents\serenity-sober-pathways-guide\serena" serena-mcp-server --help

# Should display help text
```

### Check Claude Desktop
1. Restart Claude Desktop
2. Check MCP server status in settings
3. Serena should appear as "Connected"

## 📝 Adding to PATH (Optional)

To use `uv` and scripts from anywhere without full paths:

1. **Add UV to System PATH**:
   - Add `C:\Users\cmcal\.local\bin` to PATH
   - Restart terminal

2. **Add Tools to System PATH**:
   - Add `C:\tools` to PATH
   - Restart terminal

3. **Test**:
   ```bash
   uv --version
   start-serena.bat
   ```

## 🛠️ Maintenance

### Update Serena
```bash
cd C:\Users\cmcal\OneDrive\Documents\serenity-sober-pathways-guide\serena
uv sync --upgrade
```

### Update UV
```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Reinstall if Needed
```bash
cd C:\Users\cmcal\OneDrive\Documents\serenity-sober-pathways-guide\serena
uv sync --reinstall
```

## 🚨 Troubleshooting

### Issue: "UV not found"
**Solution**: Install UV
```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Issue: "Serena command not found"
**Solution**: Use full path or add to PATH
```bash
C:\Users\cmcal\.local\bin\uv.exe run --directory "C:\Users\cmcal\OneDrive\Documents\serenity-sober-pathways-guide\serena" serena-mcp-server
```

### Issue: "Python version mismatch"
**Solution**: UV manages Python automatically, but if issues:
```bash
cd C:\Users\cmcal\OneDrive\Documents\serenity-sober-pathways-guide\serena
uv python pin 3.11
uv sync
```

### Issue: Claude Desktop doesn't show Serena
**Solution**: 
1. Check config file is saved correctly
2. Restart Claude Desktop completely
3. Check logs in Claude Desktop settings

## ✨ Features Available Globally

With Serena MCP installed globally, you get:

1. **AI-Powered Code Analysis**: Intelligent code understanding across any project
2. **Multi-Language Support**: Python, JavaScript, TypeScript, Go, Rust, and more
3. **Project Management**: Automatic project detection and configuration
4. **LSP Integration**: Language Server Protocol for IDE-like features
5. **Custom Agents**: Create project-specific AI agents
6. **Web Dashboard**: Optional web interface for monitoring
7. **Tool System**: Extensible tool framework for custom operations

## 📚 Next Steps

1. **Test in a new project**:
   ```bash
   mkdir C:\test-project
   cd C:\test-project
   C:\tools\start-serena.bat
   ```

2. **Configure for specific projects**:
   - Create `.serena/project.yml` in project root
   - Customize context and modes

3. **Integrate with development workflow**:
   - Add to npm scripts
   - Create project-specific launch configs
   - Set up keyboard shortcuts

## 🎉 Success!

Serena MCP is now installed globally and ready to use in **any project directory** on your system. The installation is:

- ✅ **Global**: Works from any directory
- ✅ **Integrated**: Connected to Claude Desktop
- ✅ **Portable**: Easy to launch with scripts
- ✅ **Maintainable**: Simple update process
- ✅ **Documented**: Clear usage instructions

You can now use Serena's AI-powered development features in all your projects!