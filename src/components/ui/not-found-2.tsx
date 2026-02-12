import { HomeIcon, SearchIcon, BuildingIcon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/liquid-glass-button";
import { buildLocalizedPath } from '../../utils/languageRouting';

function navigate(path: string) {
	window.history.pushState({}, '', buildLocalizedPath(path));
	window.dispatchEvent(new PopStateEvent('popstate'));
}

export function NotFound() {
	return (
		<div className="liquid-glass-bg relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4">
			{/* Floating glass orbs */}
			<div className="glass-orb w-96 h-96 bg-blue-200/30 -top-32 -left-32" />
			<div className="glass-orb w-72 h-72 bg-purple-200/20 -bottom-20 -right-20" style={{ animationDelay: '-5s' }} />
			<div className="glass-orb w-48 h-48 bg-cyan-200/20 top-1/4 right-1/5" style={{ animationDelay: '-10s' }} />
			<div className="glass-orb w-32 h-32 bg-amber-200/20 bottom-1/4 left-1/5" style={{ animationDelay: '-15s' }} />

			<div className="relative z-10 w-full max-w-2xl">
				{/* Main glass card */}
				<div className="glass-panel p-0 overflow-hidden">
					{/* Animated illustration section */}
					<div className="relative bg-gradient-to-b from-blue-50/80 to-transparent pt-8 pb-2 px-6">
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

					{/* Content section */}
					<div className="px-6 sm:px-10 pb-8 sm:pb-10 text-center -mt-4">
						<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
							Oops! Page not found
						</h2>
						<p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto">
							The property listing or page you're looking for may have been
							sold, moved, or doesn't exist anymore.
						</p>

						{/* Action buttons */}
						<div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
							<Button
								variant="cool"
								size="lg"
								onClick={() => navigate('/search')}
								className="rounded-xl text-base gap-2"
							>
								<HomeIcon className="size-5" />
								Go Home
							</Button>
							<Button
								variant="glass"
								size="lg"
								onClick={() => navigate('/search')}
								className="rounded-xl text-base gap-2"
							>
								<SearchIcon className="size-5" />
								Browse Properties
							</Button>
						</div>

						{/* Quick links */}
						<div className="border-t border-gray-200/60 pt-6">
							<p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-medium">Quick links</p>
							<div className="flex flex-wrap justify-center gap-2">
								<button
									onClick={() => navigate('/search')}
									className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-gray-100/80 hover:bg-gray-200/80 rounded-full transition-colors"
								>
									<SearchIcon className="size-3.5" />
									Search
								</button>
								<button
									onClick={() => navigate('/rentals')}
									className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-gray-100/80 hover:bg-gray-200/80 rounded-full transition-colors"
								>
									<BuildingIcon className="size-3.5" />
									Rentals
								</button>
								<button
									onClick={() => navigate('/agencies')}
									className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-gray-100/80 hover:bg-gray-200/80 rounded-full transition-colors"
								>
									<MapPinIcon className="size-3.5" />
									Agencies
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
