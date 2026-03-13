export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="flex flex-col"
            style={{ minHeight: '100dvh', width: '100%', background: '#FCFCFD' }}
        >
            {children}
        </div>
    );
}
