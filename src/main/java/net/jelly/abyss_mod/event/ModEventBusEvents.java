package net.jelly.abyss_mod.event;

import net.jelly.abyss_mod.AbyssMod;
import net.jelly.abyss_mod.entity.ModEntities;
import net.jelly.abyss_mod.entity.examples.octopus.OctopusEntity;
import net.jelly.abyss_mod.entity.examples.worm.WormEntity;
import net.jelly.abyss_mod.entity.examples.wyvern.WyvernEntity;
import net.jelly.abyss_mod.item.ModItems;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraftforge.event.BuildCreativeModeTabContentsEvent;
import net.minecraftforge.event.entity.EntityAttributeCreationEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid= AbyssMod.MODID, bus = Mod.EventBusSubscriber.Bus.MOD)
public class ModEventBusEvents {

    // events that implement IModBusEvent are mod bus events
    @SubscribeEvent
    public static void registerAttributes(EntityAttributeCreationEvent event) {
        event.put(ModEntities.WORM.get(), WormEntity.createAttributes().build());
        event.put(ModEntities.OCTOPUS.get(), OctopusEntity.createAttributes().build());
        event.put(ModEntities.WYVERN.get(), WyvernEntity.createAttributes().build());
    }

    // creative mode tabs
    @SubscribeEvent
    public static void buildContents(BuildCreativeModeTabContentsEvent event) {
        // Add to ingredients tab
        if (event.getTabKey() == CreativeModeTabs.INGREDIENTS) {
            event.accept(ModItems.WORM_TOOTH);
        }
    }





}
