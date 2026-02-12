import { HomeIcon, SearchIcon, BuildingIcon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/liquid-glass-button";
import { buildLocalizedPath } from '../../utils/languageRouting';

function navigate(path: string) {
	window.history.pushState({}, '', buildLocalizedPath(path));
	window.dispatchEvent(new PopStateEvent('popstate'));
}

export function NotFound() {
	return (
		<div className="liquid-glass-bg fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden px-4">
			{/* Soft gradient orbs (inline styles to avoid clipping issues with CSS blur) */}
			<div
				className="absolute pointer-events-none"
				style={{
					width: '500px', height: '500px', top: '-100px', left: '-100px',
					background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
				}}
			/>
			<div
				className="absolute pointer-events-none"
				style={{
					width: '400px', height: '400px', bottom: '-80px', right: '-80px',
					background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
				}}
			/>
			<div
				className="absolute pointer-events-none"
				style={{
					width: '300px', height: '300px', top: '20%', right: '15%',
					background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
				}}
			/>

			{/* Animated illustration */}
			<div className="relative z-10 w-full max-w-lg">
				<div
					className="mx-auto h-[200px] sm:h-[280px] bg-center bg-no-repeat bg-contain"
					style={{
						backgroundImage: 'url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif)',
					}}
					aria-hidden="true"
				>
					<h1 className="text-center font-black text-7xl sm:text-8xl md:text-9xl text-primary/10 select-none tracking-tight pt-2">
						404
					</h1>
				</div>
			</div>

			{/* Content */}
			<div className="relative z-10 text-center mt-2">
				<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
					Oops! Page not found
				</h2>
				<p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto">
					The property listing or page you're looking for may have been
					sold, moved, or doesn't exist anymore.
				</p>

				{/* Main action buttons */}
				<div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
					<Button
						variant="cool"
						size="lg"
						onClick={() => navigate('/search')}
						className="rounded-2xl text-base gap-2 px-8 h-12"
					>
						<HomeIcon className="size-5" />
						Go Home
					</Button>
					<Button
						variant="glass"
						size="lg"
						onClick={() => navigate('/search')}
						className="rounded-2xl text-base gap-2 px-8 h-12"
					>
						<SearchIcon className="size-5" />
						Browse Properties
					</Button>
				</div>

				{/* Quick links */}
				<div className="flex flex-wrap justify-center gap-3">
					<button
						onClick={() => navigate('/search')}
						className="glass-panel-light inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-all duration-300 hover:-translate-y-px cursor-pointer"
					>
						<SearchIcon className="size-3.5" />
						Search
					</button>
					<button
						onClick={() => navigate('/rentals')}
						className="glass-panel-light inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-all duration-300 hover:-translate-y-px cursor-pointer"
					>
						<BuildingIcon className="size-3.5" />
						Rentals
					</button>
					<button
						onClick={() => navigate('/agencies')}
						className="glass-panel-light inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-all duration-300 hover:-translate-y-px cursor-pointer"
					>
						<MapPinIcon className="size-3.5" />
						Agencies
					</button>
				</div>
			</div>
		</div>
	);
}
