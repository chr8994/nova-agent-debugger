import dynamic from 'next/dynamic'

// Dynamically import the client component with SSR disabled
// This prevents "document is not defined" errors from the chat-ui package
const HomeClient = dynamic(() => import('./home-client'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading chat...</p>
      </div>
    </div>
  ),
})

export default function Page() {
  return <HomeClient />
}
