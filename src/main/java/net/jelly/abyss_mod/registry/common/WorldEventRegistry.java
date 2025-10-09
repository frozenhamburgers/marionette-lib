package net.jelly.abyss_mod.registry.common;

import net.jelly.abyss_mod.AbyssMod;
import net.jelly.abyss_mod.worldevents.SonicBoomWorldEvent;
import net.minecraft.resources.ResourceLocation;
import team.lodestar.lodestone.systems.worldevent.WorldEventType;

import static team.lodestar.lodestone.registry.common.LodestoneWorldEventTypeRegistry.registerEventType;

public class WorldEventRegistry {
    public static WorldEventType SONIC_BOOM = registerEventType(new WorldEventType(new ResourceLocation(AbyssMod.MODID, "sonic_boom"), SonicBoomWorldEvent::new));
}
