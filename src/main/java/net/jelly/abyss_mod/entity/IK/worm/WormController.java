package net.jelly.abyss_mod.entity.IK.worm;

import net.jelly.abyss_mod.entity.IK.AbstractIKController;
import net.jelly.abyss_mod.entity.IK.AbstractIKSegment;
import net.jelly.abyss_mod.entity.IK.AbstractWormController;
import net.jelly.abyss_mod.entity.ModEntities;
import net.jelly.abyss_mod.registry.common.DamageTypesRegistry;
import net.minecraft.commands.arguments.EntityAnchorArgument;
import net.minecraft.core.registries.Registries;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import software.bernie.geckolib.animatable.GeoEntity;
import software.bernie.geckolib.core.animatable.GeoAnimatable;
import software.bernie.geckolib.core.animatable.instance.AnimatableInstanceCache;
import software.bernie.geckolib.core.animatable.instance.SingletonAnimatableInstanceCache;
import software.bernie.geckolib.core.animation.AnimatableManager;
import software.bernie.geckolib.core.animation.AnimationController;
import software.bernie.geckolib.core.animation.AnimationState;
import software.bernie.geckolib.core.object.PlayState;

public class WormController extends AbstractWormController {
    public WormController(EntityType<?> pEntityType, Level pLevel) {
        super(pEntityType, pLevel);
    }

    @Override
    protected void initWorm() {
        for(int i=0; i<20; i++) {
            System.out.println("adding segment " + i);
            addSegment(new WormSegment(ModEntities.WORM_SEGMENT.get(), level()));
        }
    }

    public void tick() {
        super.tick();
        if(!noNullSegments) return;
        Player nearestPlayer = this.level().getNearestPlayer(this, 200);
        if(nearestPlayer != null && !segments.isEmpty()) {
            Vec3 towardPlayer = nearestPlayer.position().subtract(head().centeredPosition()).normalize();
            target = target.add(towardPlayer.scale(0.5f));
        }
    }

}
