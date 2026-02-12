import { HomeIcon, SearchIcon, BuildingIcon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/liquid-glass-button";
import { buildLocalizedPath } from '../../utils/languageRouting';

function navigate(path: string) {
	window.history.pushState({}, '', buildLocalizedPath(path));
	window.dispatchEvent(new PopStateEvent('popstate'));
}

export function NotFound() {
	return (
		<div className="liquid-glass-bg fixed inset-0 flex flex-col items-center justify-center overflow-hidden px-4">
			{/* Floating glass orbs */}
			<div className="glass-orb w-96 h-96 bg-blue-200/30 -top-32 -left-32" />
			<div className="glass-orb w-72 h-72 bg-purple-200/20 -bottom-20 -right-20" style={{ animationDelay: '-5s' }} />
			<div className="glass-orb w-48 h-48 bg-cyan-200/20 top-1/4 right-1/5" style={{ animationDelay: '-10s' }} />
			<div className="glass-orb w-32 h-32 bg-amber-200/20 bottom-1/4 left-1/5" style={{ animationDelay: '-15s' }} />

			{/* Animated illustration */}
			<div className="relative z-10 w-full max-w-lg">
				<div
					className="mx-auto h-[200px] sm:h-[280px] bg-center bg-no-repeat bg-contain"
					style={{
						backgroundImage: 'url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif)',
					}}
					aria-hidden="true"
				>
					<h1 className="text-center font-black text-7xl sm:text-8xl md:text-9xl text-primary/15 select-none tracking-tight pt-2">
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
						variant="glass"
						size="lg"
						onClick={() => navigate('/search')}
						className="rounded-2xl text-base gap-2 px-8"
					>
						<HomeIcon className="size-5" />
						Go Home
					</Button>
					<Button
						variant="glass"
						size="lg"
						onClick={() => navigate('/search')}
						className="rounded-2xl text-base gap-2 px-8"
					>
						<SearchIcon className="size-5" />
						Browse Properties
					</Button>
				</div>

				{/* Quick links as glass pill buttons */}
				<div className="flex flex-wrap justify-center gap-3">
					<Button
						variant="glass"
						size="sm"
						onClick={() => navigate('/search')}
						className="rounded-full gap-1.5 px-5"
					>
						<SearchIcon className="size-3.5" />
						Search
					</Button>
					<Button
						variant="glass"
						size="sm"
						onClick={() => navigate('/rentals')}
						className="rounded-full gap-1.5 px-5"
					>
						<BuildingIcon className="size-3.5" />
						Rentals
					</Button>
					<Button
						variant="glass"
						size="sm"
						onClick={() => navigate('/agencies')}
						className="rounded-full gap-1.5 px-5"
					>
						<MapPinIcon className="size-3.5" />
						Agencies
					</Button>
				</div>
			</div>
		</div>
	);
}
