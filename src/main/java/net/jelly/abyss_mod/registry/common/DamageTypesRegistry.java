package net.jelly.abyss_mod.registry.common;

import net.jelly.abyss_mod.AbyssMod;
import net.minecraft.core.registries.Registries;
import net.minecraft.data.worldgen.BootstapContext;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.damagesource.DamageType;

public class DamageTypesRegistry {
    public static final ResourceKey<DamageType> WORM = register("worm");

    private static ResourceKey<DamageType> register(String name) {
        return ResourceKey.create(Registries.DAMAGE_TYPE, new ResourceLocation(AbyssMod.MODID, name));
    }

    public static void bootstrap(BootstapContext<DamageType> context) {
        context.register(WORM, new DamageType("worm", 0.1F));
    }
}
