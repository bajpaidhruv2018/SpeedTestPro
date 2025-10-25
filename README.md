# Speed Test Pro

A professional-grade internet speed testing application with real-time analytics, bufferbloat detection, and comprehensive performance metrics.

## Project info

**URL**: https://lovable.dev/projects/2fbf53e0-5ff6-4d39-bccc-ed6ed7362af1

## Features

### Core Testing Capabilities
- **Download Speed Testing**: Multi-connection throughput measurement with real-time visualization
- **Upload Speed Testing**: Parallel upload tests with statistical analysis
- **Latency Testing**: Idle and loaded latency measurements via WebSocket
- **Bufferbloat Detection**: Measures network congestion impact with letter grading (A-F)
- **Jitter Analysis**: Standard deviation of latency for connection stability

### Test Modes
- **Quick Test (15s)**: Fast overview of network performance
- **Standard Test (30s)**: Balanced accuracy and speed
- **Advanced Test (60s)**: Comprehensive analysis with high statistical confidence

### Advanced Metrics
- **P95 Window Analysis**: 95th percentile performance metrics
- **Stability Score**: Connection consistency rating (0-100)
- **Confidence Intervals**: Statistical reliability indicators
- **QoE Ratings**: Quality of Experience scores for:
  - Streaming (4K/HD/SD capability)
  - Video Calls (call quality rating)
  - Gaming (latency suitability)

### Data Persistence
- **Local Storage**: Test results saved in IndexedDB
- **Test History**: View and compare past results
- **Trend Analysis**: Charts showing performance over time
- **Export Capability**: Share and export test results

### User Experience
- **Real-time Charts**: Live throughput and latency visualization using Recharts
- **Web Workers**: Background processing for smooth UI
- **Responsive Design**: Mobile-first, works on all devices
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Error Boundaries**: Graceful error handling and recovery

## Technologies

This project is built with:

- **Frontend**: React 18, TypeScript
- **UI Framework**: shadcn/ui components, Tailwind CSS
- **Charts**: Recharts for real-time data visualization
- **Storage**: IndexedDB via idb library
- **Backend**: Lovable Cloud (Supabase Edge Functions)
- **Build Tool**: Vite
- **Testing**: Web Workers for background processing

## Architecture

### Edge Functions
- `speed-download`: Streams random data for download testing
- `speed-upload`: Receives and processes upload test data
- `speed-ping`: WebSocket endpoint for latency measurements

### Web Worker
- `speedTest.worker.ts`: Runs tests in background thread
- Handles all network operations without blocking UI
- Calculates statistics and metrics in real-time

### Component Structure
```
src/
├── components/
│   ├── SpeedTest.tsx           # Main test component
│   ├── ErrorBoundary.tsx       # Error handling wrapper
│   └── test/
│       ├── TestMetrics.tsx     # Speed & latency display
│       ├── TestCharts.tsx      # Real-time graphs
│       └── TestResults.tsx     # QoE and bufferbloat
├── pages/
│   ├── Index.tsx               # Home page
│   ├── History.tsx             # Test history & trends
│   ├── ResultDetail.tsx        # Individual result view
│   └── NotFound.tsx            # 404 page
├── workers/
│   └── speedTest.worker.ts     # Background test engine
└── lib/
    └── storage.ts              # IndexedDB operations
```

## How can I edit this code?

### Use Lovable

Simply visit the [Lovable Project](https://lovable.dev/projects/2fbf53e0-5ff6-4d39-bccc-ed6ed7362af1) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

### Use your preferred IDE

If you want to work locally using your own IDE, you can clone this repo and push changes.

Requirements:
- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start development server
npm run dev
```

### Edit directly in GitHub

- Navigate to the desired file(s)
- Click the "Edit" button (pencil icon)
- Make your changes and commit

### Use GitHub Codespaces

- Click "Code" button → "Codespaces" tab
- Click "New codespace"
- Edit files and commit changes

## Testing Guide

### Manual Testing Checklist

1. **Basic Functionality**
   - [ ] Start a quick test and verify it completes
   - [ ] Start a standard test and verify it completes
   - [ ] Start an advanced test and verify it completes
   - [ ] Stop a test mid-run and verify graceful cancellation
   - [ ] Refresh page during test and verify state recovery

2. **Metrics Validation**
   - [ ] Verify download speed displays in real-time
   - [ ] Verify upload speed displays in real-time
   - [ ] Verify latency displays in real-time
   - [ ] Check bufferbloat grade is calculated correctly
   - [ ] Verify QoE badges appear after test completion

3. **Data Persistence**
   - [ ] Complete a test and verify it appears in History
   - [ ] Navigate to result detail page and verify data
   - [ ] Delete a result and verify removal
   - [ ] Clear all results and verify empty state

4. **Responsive Design**
   - [ ] Test on mobile viewport (320px-767px)
   - [ ] Test on tablet viewport (768px-1023px)
   - [ ] Test on desktop viewport (1024px+)
   - [ ] Verify charts scale appropriately

5. **Accessibility**
   - [ ] Tab through interface with keyboard
   - [ ] Verify ARIA labels on interactive elements
   - [ ] Test with screen reader
   - [ ] Check color contrast ratios

6. **Error Handling**
   - [ ] Disconnect network mid-test
   - [ ] Test with slow connection
   - [ ] Test with browser that doesn't support Workers
   - [ ] Verify error boundary catches crashes

### Performance Testing

- Monitor browser DevTools Performance tab during tests
- Verify Web Worker runs tests without blocking main thread
- Check memory usage doesn't leak over multiple tests
- Validate IndexedDB operations are async and non-blocking

## Deployment

Simply open [Lovable](https://lovable.dev/projects/2fbf53e0-5ff6-4d39-bccc-ed6ed7362af1) and click on Share → Publish.

## Custom Domain

To connect a custom domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## License

Built with [Lovable](https://lovable.dev)
