import { createSignal, For, Show } from "solid-js";
import { Search, ChevronRight, Package, X, Check } from "lucide-solid";
import type { Product } from "~/db/db";

interface ProductSelectorProps {
	products: Product[];
	selectedIds: string[];
	onSelect: (ids: string[]) => void;
	placeholder?: string;
	multiple?: boolean;
	label?: string;
}

export function ProductSelector(props: ProductSelectorProps) {
	const [isOpen, setIsOpen] = createSignal(false);
	const [search, setSearch] = createSignal("");

	const selectedProducts = () =>
		props.products.filter((p) => props.selectedIds.includes(p.id));

	const filteredProducts = () =>
		props.products.filter((p) =>
			p.name.toLowerCase().includes(search().toLowerCase()),
		);

	const toggleProduct = (id: string) => {
		if (props.multiple) {
			if (props.selectedIds.includes(id)) {
				props.onSelect(props.selectedIds.filter((i) => i !== id));
			} else {
				props.onSelect([...props.selectedIds, id]);
			}
		} else {
			props.onSelect([id]);
			setIsOpen(false);
		}
	};

	return (
		<div class="space-y-1.5 min-w-0">
			{props.label && (
				<label class="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">
					{props.label}
				</label>
			)}

			<div class="relative">
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen())}
					class={`w-full min-h-[56px] bg-background hover:bg-muted/40 p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${isOpen() ? "border-primary/40 ring-4 ring-primary/5" : "border-emerald-100"}`}
				>
					<div class="flex items-center gap-3 flex-1 min-w-0">
						<div class="w-10 h-10 rounded-xl bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative">
							<Show
								when={selectedProducts().length === 1 && selectedProducts()[0].image}
								fallback={
									<Package
										size={18}
										class="text-muted-foreground/30"
									/>
								}
							>
								<img
									src={selectedProducts()[0].image}
									class="w-full h-full object-cover"
									onError={(e) => {
										e.currentTarget.style.display = "none";
										const parent = e.currentTarget.parentElement;
										if (parent && !parent.querySelector(".fallback-icon")) {
											const fallback = document.createElement("div");
											fallback.className = "fallback-icon absolute inset-0 flex items-center justify-center bg-muted";
											fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/30"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
											parent.appendChild(fallback);
										}
									}}
								/>
							</Show>
						</div>
						<div class="flex flex-col text-left min-w-0">
							<span class="text-sm font-black text-foreground truncate leading-tight">
								{selectedProducts().length === 0
									? props.placeholder || "Pilih Produk..."
									: selectedProducts().length === 1
										? selectedProducts()[0].name
										: `${selectedProducts().length} Produk Terpilih`}
							</span>
							<Show when={selectedProducts().length === 1}>
								<span class="text-[10px] font-bold text-muted-foreground/60">
									Rp {selectedProducts()[0].price.toLocaleString()}
								</span>
							</Show>
							<Show when={selectedProducts().length > 1}>
								<span class="text-[10px] font-bold text-primary/60 truncate">
									{selectedProducts().map(p => p.name).join(", ")}
								</span>
							</Show>
						</div>
					</div>
					<ChevronRight
						size={16}
						class={`text-muted-foreground/30 transition-transform shrink-0 ${isOpen() ? "rotate-90" : ""}`}
					/>
				</button>

				{/* Backdrop */}
				<Show when={isOpen()}>
					<div 
						class="fixed inset-0 z-[60]" 
						onClick={() => setIsOpen(false)} 
					/>
					
					{/* Dropdown Panel */}
					<div class="absolute left-0 right-0 top-[calc(100%+8px)] p-4 bg-card border-2 border-primary/20 rounded-[28px] shadow-2xl animate-in fade-in zoom-in-95 z-[70] max-h-[360px] flex flex-col ring-4 ring-primary/5">
						<div class="relative mb-3 sticky top-0 bg-card py-1 z-10">
							<Search
								class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
								size={14}
							/>
							<input
								type="text"
								placeholder="Cari produk..."
								class="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/40 border border-border/40 text-sm font-bold focus:outline-none focus:border-primary/40 focus:bg-background transition-all"
								onInput={(e) => setSearch(e.currentTarget.value)}
								value={search()}
								autofocus
							/>
                            <Show when={search()}>
                                <button 
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
                                    onClick={() => setSearch("")}
                                >
                                    <X size={14} />
                                </button>
                            </Show>
						</div>

						<div class="overflow-y-auto flex-1 h-full pr-1 scrollbar-hide space-y-1">
                            <Show when={props.multiple}>
                                <button
                                    type="button"
                                    class="flex items-center justify-between w-full p-2.5 mb-2 bg-primary/5 hover:bg-primary/10 rounded-xl transition-all text-left group"
                                    onClick={() => {
                                        if (props.selectedIds.length === props.products.length) {
                                            props.onSelect([]);
                                        } else {
                                            props.onSelect(props.products.map(p => p.id));
                                        }
                                    }}
                                >
                                    <span class="text-xs font-black text-primary uppercase tracking-widest ml-1">
                                        {props.selectedIds.length === props.products.length ? "Batal Pilih Semua" : "Pilih Semua Produk"}
                                    </span>
                                    <div class={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${props.selectedIds.length === props.products.length ? "bg-primary border-primary shadow-sm shadow-primary/20" : "border-primary/20 group-hover:border-primary/40"}`}>
                                        <Show when={props.selectedIds.length === props.products.length}>
                                            <Check size={12} class="text-white" stroke-width={3} />
                                        </Show>
                                    </div>
                                </button>
                            </Show>

							<For each={filteredProducts()}>
								{(prod) => {
									const p = () => prod;
									return (
										<button
											type="button"
											class={`flex items-center justify-between w-full p-2.5 rounded-xl transition-all text-left group ${props.selectedIds.includes(p().id) ? "bg-primary/5" : "hover:bg-muted/40"}`}
											onClick={() => toggleProduct(p().id)}
										>
											<div class="flex items-center gap-3 min-w-0">
												<div class="w-9 h-9 rounded-lg bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0 relative">
													<Show
														when={p().image}
														fallback={
															<Package
																size={14}
																class="text-muted-foreground/20"
															/>
														}
													>
														<img
															src={p().image}
															class="w-full h-full object-cover"
															onError={(e) => {
																e.currentTarget.style.display = "none";
																const parent = e.currentTarget.parentElement;
																if (parent && !parent.querySelector(".fallback-icon")) {
																	const fallback = document.createElement("div");
																	fallback.className = "fallback-icon absolute inset-0 flex items-center justify-center bg-muted";
																	fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/20"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
																	parent.appendChild(fallback);
																}
															}}
														/>
													</Show>
												</div>
												<div class="flex flex-col min-w-0">
													<span class={`text-[13px] font-bold truncate ${props.selectedIds.includes(p().id) ? "text-primary" : "text-foreground"}`}>
														{p().name}
													</span>
													<span class="text-[10px] font-medium text-muted-foreground/60">
														Rp {p().price.toLocaleString()}
													</span>
												</div>
											</div>
											<Show when={props.multiple}>
												<div class={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${props.selectedIds.includes(p().id) ? "bg-primary border-primary shadow-sm shadow-primary/20" : "border-border/40 group-hover:border-primary/30"}`}>
													<Show when={props.selectedIds.includes(p().id)}>
														<Check size={12} class="text-white" stroke-width={3} />
													</Show>
												</div>
											</Show>
										</button>
									);
								}}
							</For>

							<Show when={filteredProducts().length === 0}>
								<div class="py-10 flex flex-col items-center justify-center text-center px-4">
									<div class="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
										<Search size={20} class="text-muted-foreground/20" />
									</div>
									<p class="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">
										Produk tidak ditemukan
									</p>
								</div>
							</Show>
						</div>
					</div>
				</Show>
			</div>
		</div>
	);
}
