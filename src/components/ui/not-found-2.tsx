import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { HomeIcon, CompassIcon } from "lucide-react";
import { buildLocalizedPath } from '../../utils/languageRouting';

function navigate(path: string) {
	window.history.pushState({}, '', buildLocalizedPath(path));
	window.dispatchEvent(new PopStateEvent('popstate'));
}

export function NotFound() {
	return (
		<div className="liquid-glass-bg relative flex min-h-screen w-full items-center justify-center overflow-hidden">
			{/* Floating glass orbs */}
			<div className="glass-orb w-72 h-72 bg-blue-200/40 -top-20 -left-20" />
			<div className="glass-orb w-56 h-56 bg-purple-200/30 -bottom-10 -right-10" style={{ animationDelay: '-5s' }} />
			<div className="glass-orb w-40 h-40 bg-cyan-200/30 top-1/3 right-1/4" style={{ animationDelay: '-10s' }} />

			<div className="glass-panel p-8 md:p-12 max-w-lg mx-4">
				<Empty className="border-0 p-0">
					<EmptyHeader>
						<EmptyTitle className="font-extrabold text-9xl text-gray-200 select-none leading-none">
							404
						</EmptyTitle>
						<EmptyDescription className="-mt-4 text-nowrap text-gray-500 text-base">
							The page you're looking for might have been <br />
							moved or doesn't exist.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<div className="flex gap-3">
							<button
								onClick={() => navigate('/search')}
								className="glass-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium"
							>
								<HomeIcon className="size-4" />
								Go Home
							</button>
							<button
								onClick={() => navigate('/rentals')}
								className="glass-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium"
							>
								<CompassIcon className="size-4" />
								Explore
							</button>
						</div>
					</EmptyContent>
				</Empty>
			</div>
		</div>
	);
}
