# Unified Protein Tools Server

A comprehensive Express.js server that handles both file uploads and CLI tool execution for protein analysis tools.

## Features

✅ **File Upload Management**
- Multi-tool file upload support (ProteinMPNN, ColabFold, Foldseek, HADDOCK)
- Automatic file validation based on tool type
- Organized storage in respective container directories

✅ **CLI Tool Execution**
- Direct execution of containerized protein analysis tools
- Asynchronous job processing with status tracking
- Real-time progress monitoring

✅ **Job Management**
- Unique job ID generation with UUID
- Job status tracking (queued, running, completed, failed)
- Job history and result management
- Automatic cleanup of old jobs

✅ **REST API**
- RESTful endpoints for all operations
- JSON responses with comprehensive error handling
- CORS enabled for web application integration

## Quick Start

### 1. Install Dependencies
```bash
cd /data/zqjd/server
npm install
```

### 2. Start Server
```bash
./start.sh
```

### 3. Test Server
```bash
curl http://localhost:3001/api/health
```

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and available tools.

### File Upload Only
```
POST /api/upload
Content-Type: multipart/form-data

Form Data:
- file: The file to upload
- toolType: proteinmpnn|colabfold|foldseek|haddock
- jobName: Optional job name
```

### Job Execution Only
```
POST /api/execute
Content-Type: application/json

Body:
{
  "toolType": "proteinmpnn",
  "filePath": "/path/to/uploaded/file",
  "parameters": {
    "chains": "A,B",
    "numDesigns": 10,
    "temperature": 0.2
  }
}
```

### Combined Upload + Execute
```
POST /api/run-tool
Content-Type: multipart/form-data

Form Data:
- file: The file to upload
- toolType: proteinmpnn|colabfold|foldseek|haddock
- jobName: Optional job name
- parameters: JSON string of tool parameters
```

### Job Status
```
GET /api/job/:jobId
```
Returns detailed job information and status.

### List Jobs
```
GET /api/jobs?tool=proteinmpnn&status=completed&limit=10
```
Returns list of jobs with optional filtering.

### Download Results
```
GET /api/download/:jobId/:filename
```
Downloads result files from completed jobs.

## Tool Configurations

### ProteinMPNN
- **Input**: PDB files
- **Parameters**: chains, numDesigns, temperature, omitAA, fixedPositions
- **Output**: Designed sequences and structures

### ColabFold
- **Input**: FASTA files
- **Parameters**: modelType, numModels, maxMSA
- **Output**: Predicted structures and confidence scores

### Foldseek
- **Input**: PDB files  
- **Parameters**: database, maxResults, evalue, alignmentType
- **Output**: Structure search results and alignments

### HADDOCK
- **Input**: PDB, MOL2, SDF files
- **Parameters**: dockingType, sampling, clustering, water
- **Output**: Docked structures and scores

## File Structure

```
/data/zqjd/
├── server/             # Unified server
│   ├── app.js          # Main server application
│   ├── package.json    # Dependencies and scripts
│   ├── start.sh        # Startup script
│   ├── README.md       # This file
│   └── node_modules/   # Dependencies (after npm install)
├── zqjd77/             # Frontend web application
│   ├── tools/          # Tool interfaces
│   ├── scripts/        # Updated JavaScript
│   └── index.html      # Main page
└── containers/         # Tool containers and I/O
    ├── proteinmpnn/
    │   ├── input/      # Uploaded PDB files
    │   ├── output/     # Generated sequences
    │   └── run_proteinmpnn.py
    ├── colabfold/
    │   ├── input/      # Uploaded FASTA files
    │   ├── output/     # Predicted structures
    │   └── run_colabfold.py
    ├── foldseek/
    │   ├── input/      # Query structures
    │   ├── output/     # Search results
    │   └── run_foldseek.py
    └── haddock/
        ├── input/      # Input structures
        ├── output/     # Docked complexes
        └── run_haddock.py
```

## Job Workflow

1. **File Upload**: User uploads file via frontend
2. **Job Creation**: Server creates job with unique ID
3. **Tool Execution**: Server runs appropriate CLI tool
4. **Progress Tracking**: Job status updated in real-time
5. **Result Storage**: Output files saved to tool output directory
6. **Completion**: Job marked complete, results available for download

## Frontend Integration

Update frontend scripts to use the unified server:

```javascript
// Example: Submit ProteinMPNN job
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('toolType', 'proteinmpnn');
formData.append('parameters', JSON.stringify({
    chains: 'A,B',
    numDesigns: 10,
    temperature: 0.2
}));

const response = await fetch('/api/run-tool', {
    method: 'POST',
    body: formData
});

const result = await response.json();
console.log('Job ID:', result.jobId);
```

## Security Features

- File type validation per tool
- File size limits (50-100MB depending on tool)
- Path traversal prevention
- Input sanitization
- Error handling and logging

## Production Deployment

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start app.js --name "protein-tools-server"
pm2 startup
pm2 save
```

### Environment Variables
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)

### Monitoring
- Health check: `GET /api/health`
- Job statistics: `GET /api/jobs`
- PM2 monitoring: `pm2 monit`

## Troubleshooting

### Server Won't Start
- Check if port 3001 is available: `lsof -i :3001`
- Verify Node.js and npm are installed
- Check dependencies: `npm install`

### Job Execution Fails
- Verify tool scripts are executable
- Check file permissions in container directories
- Review job error logs: `GET /api/job/:jobId`

### File Upload Issues
- Check file size limits
- Verify file type is supported for the tool
- Ensure sufficient disk space

## Development

### Adding New Tools
1. Add tool configuration to `TOOLS` object
2. Create input/output directories
3. Add parameter handling in `executeToolCommand`
4. Update frontend scripts

### Debugging
- Enable debug logs: `DEBUG=* npm start`
- Check job status: `curl http://localhost:3001/api/jobs`
- Monitor file system: `ls -la ../zqjd77/containers/*/input/`

---

**Status**: ✅ Ready for Production Use  
**Last Updated**: $(date)  
**Version**: 1.0.0
