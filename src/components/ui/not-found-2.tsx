"use client";
import { Helmet } from 'react-helmet-async';
import { buildLocalizedPath } from '../../utils/languageRouting';

export function NotFound() {
	const homePath = buildLocalizedPath('/');

	return (
		<section className="bg-white font-serif min-h-screen flex items-center justify-center">
			<Helmet>
				<title>Page Not Found | BalkanEstateAI</title>
				<meta name="robots" content="noindex, nofollow" />
				<meta name="description" content="The page you are looking for is not available. Return to BalkanEstateAI to find properties for sale across the Balkans." />
			</Helmet>
			<div className="container mx-auto">
				<div className="flex justify-center">
					<div className="w-full sm:w-10/12 md:w-8/12 text-center">
						<div
							className="bg-[url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif)] h-[250px] sm:h-[350px] md:h-[400px] bg-center bg-no-repeat bg-contain"
							aria-hidden="true"
						>
							<h1 className="text-center text-black text-6xl sm:text-7xl md:text-8xl pt-6 sm:pt-8">
								404
							</h1>
						</div>
						<div className="relative z-10 mt-[-50px]">
							<h3 className="text-2xl text-black sm:text-3xl font-bold mb-4">
								Look like you're lost
							</h3>
							<p className="mb-6 text-black sm:mb-5">
								The page you are looking for is not available!
							</p>
							<a
								href={homePath}
								className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 my-5 bg-green-600 hover:bg-green-700 text-white cursor-pointer transition-colors"
							>
								Go to Home
							</a>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
